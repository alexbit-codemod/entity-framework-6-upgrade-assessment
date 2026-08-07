namespace Sample
{
    public class Customer
    {
        public virtual Address ShippingAddress { get; set; }
        public virtual ICollection<Order> Orders { get; set; }
    }

    public class Address { }
    public class Order { }
}
