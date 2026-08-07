using System.Collections.Generic;

namespace Sample
{
    public class Order
    {
        public virtual Customer Customer { get; set; }
        public virtual List<OrderLine> Lines { get; set; }
        public virtual decimal Total { get; set; }
        public virtual DateTimeOffset? ShippedAt { get; set; }
    }

    public class Customer { }
    public class OrderLine { }
}
