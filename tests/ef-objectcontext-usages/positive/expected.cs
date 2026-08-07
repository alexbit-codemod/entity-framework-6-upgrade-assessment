using System.Data.Entity.Core.Objects;

namespace Sample
{
    public class LegacyContext : ObjectContext
    {
        public void Use(ObjectContext other)
        {
            ObjectContext local = other;
        }
    }
}
